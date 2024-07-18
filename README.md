# 🎉 Welcome to Watch Together App! 🎉

Watch Together App is a powerful and easy-to-use application that allows you to watch videos simultaneously with your friends or family using internet local (dont need Internet only videos downloaded in your machine)! Built with `socket.io`, it offers real-time communication and seamless video synchronization. Let's get started! 🚀

## 📋 Prerequisites

Before you begin, ensure you have met the following requirements:

- You have Docker Installed

## 📥 Download Docker Desktop

Download the Docker Desktop for Linux from the official Docker website: [Download Docker Desktop](https://docs.docker.com/desktop/install/linux-install/)

Download the Docker Desktop for Windows from the official Docker website: [Download Docker Desktop](https://docs.docker.com/desktop/install/windows-install/)

## 🛠️ Install Docker Desktop (linux)

1. Navigate to the directory where the `.deb` file is downloaded (usually `~/Downloads`):
    ```sh
    cd ~/Downloads
    ```

2. Install Docker Desktop:
    ```sh
    sudo apt-get install ./docker-desktop-amd64.deb
    ```

### 🛠️ Troubleshooting Dependencies

If you encounter the following error:
```
user@user-pc:~/Downloads$ sudo apt-get install ./docker-desktop-amd64.deb 
Reading package lists... Done
Building dependency tree       
Reading state information... Done
Note, selecting 'docker-desktop' instead of './docker-desktop-amd64.deb'
Some packages could not be installed. This may mean that you have
requested an impossible situation or if you are using the unstable
distribution that some required packages have not yet been created
or been moved out of Incoming.
The following information may help to resolve the situation:

The following packages have unmet dependencies:
 docker-desktop : Depends: docker-ce-cli but it is not installable
E: Unable to correct problems, you have held broken packages.
```

Follow these steps to resolve it:

1. Install necessary dependencies:
    ```sh
    sudo apt-get install apt-transport-https ca-certificates curl gnupg lsb-release
    ```

2. Add Docker’s official GPG key and set up the stable repository:
    ```sh
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    ```

3. Update the package index:
    ```sh
    sudo apt-get update
    ```

4. Install Docker CLI:
    ```sh
    sudo apt-get install docker-ce-cli
    ```

5. Install Docker Desktop again:
    ```sh
    sudo apt-get install ./docker-desktop-amd64.deb
    ```
## 🚀 Start Docker Desktop

To start Docker Desktop, run:

```sh
systemctl --user start docker-desktop
```

## 🚀 Running the Application

To start the application, run the following command. If you encounter a port allocation error, ensure you stop any existing Docker containers using port 3000 before running this command:

```sh
docker run -p 3000:3000 my-socket-app
```

If you see an error like:
```
docker: Error response from daemon: driver failed programming external connectivity on endpoint exciting_mayer (8cef6dfc2060df3cee4e7d1fbc3a32ea50c72b2621596faa1015522c756a5c96): Bind for 0.0.0.0:3000 failed: port is already allocated.
```

Stop the existing container using:
```sh
docker stop <container_id>
```

For find `<container_id>`:
```sh
docker ps
```

Then retry the `docker run` command.

You should see a message indicating the server is running:

```
Server is running. Access it at http://<your-ip>:3000
```

Replace `<your-ip>` with your host machine's IP address. For example, if your IP address is `192.168.1.71`, you can access the application at:

```
http://192.168.1.71:3000
```

## 🎥 Bonus: Using IPFS for Video Hosting

You can also use videos hosted on IPFS! To do this, ensure that the host or client has IPFS installed. At least one device should have IPFS set up.

With Watch Together App, you can enjoy seamless video synchronization and real-time communication. 

Happy watching! 🎥🍿