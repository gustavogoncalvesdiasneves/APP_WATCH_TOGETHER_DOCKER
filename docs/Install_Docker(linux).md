# Docker Desktop Installation Guide for Linux

## Step 1: Install `gnome-terminal`
For non-Gnome Desktop environments, `gnome-terminal` must be installed:

```sh
sudo apt install gnome-terminal
```

## Step 2: Download Docker Desktop
Download the Docker Desktop from the official Docker site:
[Docker Desktop for Linux](https://docs.docker.com/desktop/install/linux-install/)

## Step 3: Install Docker Desktop
After downloading, navigate to the folder where the `.deb` file is located (usually `Downloads`). Open a terminal and run:

```sh
sudo apt-get install ./docker-desktop-amd64.deb
```

### If you encounter the following error:

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

### Follow these steps to resolve the issue:

1. Install necessary dependencies:

    ```sh
    sudo apt-get install apt-transport-https ca-certificates curl gnupg lsb-release
    ```

2. Add the Docker official GPG key:

    ```sh
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    ```

3. Set up the stable repository:

    ```sh
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    ```

4. Update the package list:

    ```sh
    sudo apt-get update
    ```

5. Install `docker-ce-cli`:

    ```sh
    sudo apt-get install docker-ce-cli
    ```

6. Install Docker Desktop:

    ```sh
    sudo apt-get install ./docker-desktop-amd64.deb
    ```

## Step 4: Start Docker Desktop

To start Docker Desktop, run:

```sh
systemctl --user start docker-desktop
```

That's it! Docker Desktop should now be installed and running on your system.