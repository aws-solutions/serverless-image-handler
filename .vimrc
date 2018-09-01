nmap <silent> <leader>b :!clear && docker build -t amazonlinux:thumbor .<cr>
nmap <silent> <leader>r :!clear && docker run -it --rm --name thumbor --volume $PWD:/app amazonlinux:thumbor /bin/bash<cr>
